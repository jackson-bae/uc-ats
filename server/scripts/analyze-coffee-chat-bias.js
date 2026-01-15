/**
 * Coffee Chat Interviewer Bias Analysis
 *
 * This script analyzes whether there's a statistically significant correlation
 * between being assigned certain coffee chat interviewers and advancing to the
 * next stage of the application process.
 *
 * Usage: cd server && node scripts/analyze-coffee-chat-bias.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Statistical helper functions
function chiSquareTest(observed, expected) {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }
  return chiSquare;
}

// Chi-square critical values (df, alpha=0.05)
const chiSquareCritical = {
  1: 3.841,
  2: 5.991,
  3: 7.815,
  4: 9.488,
  5: 11.070,
  6: 12.592,
  7: 14.067,
  8: 15.507,
  9: 16.919,
  10: 18.307,
  15: 24.996,
  20: 31.410,
  25: 37.652,
  30: 43.773
};

function getCriticalValue(df) {
  if (chiSquareCritical[df]) return chiSquareCritical[df];
  // Approximate for larger df
  const keys = Object.keys(chiSquareCritical).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df > keys[i] && df < keys[i + 1]) {
      // Linear interpolation
      const ratio = (df - keys[i]) / (keys[i + 1] - keys[i]);
      return chiSquareCritical[keys[i]] + ratio * (chiSquareCritical[keys[i + 1]] - chiSquareCritical[keys[i]]);
    }
  }
  // For very large df, use approximation
  return df + 2 * Math.sqrt(2 * df);
}

// Standard normal CDF approximation (for z-scores)
function normalCDF(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

// Two-proportion z-test
function twoProportionZTest(successes1, n1, successes2, n2) {
  const p1 = successes1 / n1;
  const p2 = successes2 / n2;
  const pooledP = (successes1 + successes2) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

  if (se === 0) return { z: 0, pValue: 1 };

  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return { z, pValue };
}

// Calculate confidence interval for a proportion
function proportionCI(successes, n, confidence = 0.95) {
  const p = successes / n;
  const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
  const se = Math.sqrt(p * (1 - p) / n);
  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se)
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('COFFEE CHAT INTERVIEWER BIAS ANALYSIS');
  console.log('='.repeat(80));
  console.log('\n');

  // Step 1: Get the previous (non-active) cycle
  const cycles = await prisma.recruitingCycle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2
  });

  if (cycles.length === 0) {
    console.log('ERROR: No recruiting cycles found.');
    return;
  }

  // Use the most recent non-active cycle, or the most recent if all are inactive
  let targetCycle = cycles.find(c => !c.isActive) || cycles[0];

  console.log(`Analyzing cycle: ${targetCycle.name} (ID: ${targetCycle.id})`);
  console.log(`Cycle active: ${targetCycle.isActive}`);
  console.log('\n');

  // Step 2: Get all coffee chat interviews for this cycle
  const coffeeChatInterviews = await prisma.interview.findMany({
    where: {
      cycleId: targetCycle.id,
      interviewType: 'COFFEE_CHAT'
    },
    include: {
      assignments: {
        include: {
          user: true
        }
      },
      evaluations: {
        include: {
          application: {
            include: {
              candidate: true
            }
          },
          evaluator: true
        }
      }
    }
  });

  console.log(`Found ${coffeeChatInterviews.length} coffee chat interview events\n`);

  if (coffeeChatInterviews.length === 0) {
    console.log('No coffee chat interviews found. Checking legacy CoffeeChat table...\n');

    // Check legacy coffee chat table
    const legacyCoffeeChats = await prisma.coffeeChat.findMany({
      include: {
        candidate: {
          include: {
            applications: {
              where: { cycleId: targetCycle.id }
            }
          }
        },
        evaluations: {
          include: {
            evaluator: true
          }
        }
      }
    });

    if (legacyCoffeeChats.length > 0) {
      console.log(`Found ${legacyCoffeeChats.length} legacy coffee chats`);
      await analyzeLegacyCoffeeChats(legacyCoffeeChats, targetCycle);
    } else {
      console.log('No coffee chat data found in either table.');
    }
    return;
  }

  // Step 3: Collect all evaluations and group by evaluator
  const evaluatorStats = new Map(); // evaluatorId -> { name, total, advanced, decisions: [] }
  const applicationOutcomes = new Map(); // applicationId -> { advanced: boolean, evaluators: [], decisions: [] }

  // Get Round 1 interviews to determine who advanced
  const roundOneInterviews = await prisma.interview.findMany({
    where: {
      cycleId: targetCycle.id,
      interviewType: 'ROUND_ONE'
    },
    include: {
      evaluations: true,
      firstRoundEvaluations: true
    }
  });

  // Build set of applications that made it to Round 1
  const advancedToRoundOne = new Set();
  for (const interview of roundOneInterviews) {
    for (const evaluation of interview.evaluations) {
      advancedToRoundOne.add(evaluation.applicationId);
    }
    for (const evaluation of interview.firstRoundEvaluations) {
      advancedToRoundOne.add(evaluation.applicationId);
    }
  }

  console.log(`Applications that advanced to Round 1: ${advancedToRoundOne.size}\n`);

  // Process coffee chat evaluations
  for (const interview of coffeeChatInterviews) {
    for (const evaluation of interview.evaluations) {
      const evaluatorId = evaluation.evaluatorId;
      const applicationId = evaluation.applicationId;
      const advanced = advancedToRoundOne.has(applicationId);

      // Initialize evaluator stats
      if (!evaluatorStats.has(evaluatorId)) {
        evaluatorStats.set(evaluatorId, {
          name: evaluation.evaluator.fullName,
          total: 0,
          advanced: 0,
          decisions: [],
          yesDecisions: 0,
          noDecisions: 0
        });
      }

      const stats = evaluatorStats.get(evaluatorId);
      stats.total++;
      if (advanced) stats.advanced++;
      if (evaluation.decision) {
        stats.decisions.push(evaluation.decision);
        if (['YES', 'MAYBE_YES'].includes(evaluation.decision)) {
          stats.yesDecisions++;
        } else if (['NO', 'MAYBE_NO'].includes(evaluation.decision)) {
          stats.noDecisions++;
        }
      }

      // Track application outcomes
      if (!applicationOutcomes.has(applicationId)) {
        applicationOutcomes.set(applicationId, {
          advanced,
          evaluators: [],
          decisions: []
        });
      }
      applicationOutcomes.get(applicationId).evaluators.push(evaluatorId);
      if (evaluation.decision) {
        applicationOutcomes.get(applicationId).decisions.push(evaluation.decision);
      }
    }
  }

  // Step 4: Calculate statistics
  console.log('='.repeat(80));
  console.log('EVALUATOR-LEVEL STATISTICS');
  console.log('='.repeat(80));
  console.log('\n');

  const evaluatorArray = Array.from(evaluatorStats.entries())
    .map(([id, stats]) => ({
      id,
      ...stats,
      advancementRate: stats.total > 0 ? stats.advanced / stats.total : 0
    }))
    .filter(e => e.total >= 3) // Only include evaluators with at least 3 evaluations
    .sort((a, b) => b.advancementRate - a.advancementRate);

  if (evaluatorArray.length === 0) {
    console.log('Not enough data for evaluator-level analysis (need evaluators with 3+ evaluations).\n');
    await prisma.$disconnect();
    return;
  }

  // Calculate overall advancement rate
  const totalEvaluated = evaluatorArray.reduce((sum, e) => sum + e.total, 0);
  const totalAdvanced = evaluatorArray.reduce((sum, e) => sum + e.advanced, 0);
  const overallAdvancementRate = totalAdvanced / totalEvaluated;

  console.log(`Overall Statistics:`);
  console.log(`  Total applications evaluated: ${totalEvaluated}`);
  console.log(`  Total advanced to Round 1: ${totalAdvanced}`);
  console.log(`  Overall advancement rate: ${(overallAdvancementRate * 100).toFixed(1)}%`);
  console.log('\n');

  // Print evaluator breakdown
  console.log('Evaluator Breakdown (sorted by advancement rate):');
  console.log('-'.repeat(80));
  console.log(
    'Evaluator'.padEnd(25) +
    'Evaluated'.padStart(10) +
    'Advanced'.padStart(10) +
    'Rate'.padStart(10) +
    '95% CI'.padStart(20) +
    'Yes/No'.padStart(10)
  );
  console.log('-'.repeat(80));

  for (const evaluator of evaluatorArray) {
    const ci = proportionCI(evaluator.advanced, evaluator.total);
    console.log(
      evaluator.name.substring(0, 24).padEnd(25) +
      evaluator.total.toString().padStart(10) +
      evaluator.advanced.toString().padStart(10) +
      `${(evaluator.advancementRate * 100).toFixed(1)}%`.padStart(10) +
      `[${(ci.lower * 100).toFixed(1)}%-${(ci.upper * 100).toFixed(1)}%]`.padStart(20) +
      `${evaluator.yesDecisions}/${evaluator.noDecisions}`.padStart(10)
    );
  }

  console.log('\n');

  // Step 5: Chi-Square Test for Independence
  console.log('='.repeat(80));
  console.log('CHI-SQUARE TEST FOR INDEPENDENCE');
  console.log('='.repeat(80));
  console.log('\n');
  console.log('H0: Interviewer assignment is independent of advancement outcome');
  console.log('H1: Interviewer assignment affects advancement outcome');
  console.log('\n');

  // Build contingency table
  const observed = [];
  const expected = [];

  for (const evaluator of evaluatorArray) {
    observed.push(evaluator.advanced);
    observed.push(evaluator.total - evaluator.advanced);
    expected.push(evaluator.total * overallAdvancementRate);
    expected.push(evaluator.total * (1 - overallAdvancementRate));
  }

  const chiSquare = chiSquareTest(observed, expected);
  const df = evaluatorArray.length - 1;
  const criticalValue = getCriticalValue(df);

  console.log(`Chi-Square Statistic: ${chiSquare.toFixed(4)}`);
  console.log(`Degrees of Freedom: ${df}`);
  console.log(`Critical Value (α=0.05): ${criticalValue.toFixed(4)}`);
  console.log('\n');

  if (chiSquare > criticalValue) {
    console.log('*** RESULT: REJECT H0 ***');
    console.log('There IS a statistically significant relationship between');
    console.log('interviewer assignment and advancement outcome (p < 0.05).');
  } else {
    console.log('*** RESULT: FAIL TO REJECT H0 ***');
    console.log('There is NO statistically significant relationship between');
    console.log('interviewer assignment and advancement outcome at α=0.05.');
  }

  console.log('\n');

  // Step 6: Identify outlier evaluators
  console.log('='.repeat(80));
  console.log('PAIRWISE COMPARISONS (vs. Overall Rate)');
  console.log('='.repeat(80));
  console.log('\n');

  const outliers = [];
  for (const evaluator of evaluatorArray) {
    const { z, pValue } = twoProportionZTest(
      evaluator.advanced, evaluator.total,
      totalAdvanced - evaluator.advanced, totalEvaluated - evaluator.total
    );

    if (pValue < 0.05) {
      outliers.push({
        ...evaluator,
        z,
        pValue,
        direction: evaluator.advancementRate > overallAdvancementRate ? 'MORE LENIENT' : 'MORE STRICT'
      });
    }
  }

  if (outliers.length === 0) {
    console.log('No individual evaluators show statistically significant deviation');
    console.log('from the overall advancement rate.');
  } else {
    console.log('Evaluators with statistically significant deviation (p < 0.05):');
    console.log('-'.repeat(80));

    for (const outlier of outliers) {
      console.log(`\n${outlier.name}:`);
      console.log(`  Advancement Rate: ${(outlier.advancementRate * 100).toFixed(1)}% vs ${(overallAdvancementRate * 100).toFixed(1)}% overall`);
      console.log(`  Z-score: ${outlier.z.toFixed(3)}`);
      console.log(`  P-value: ${outlier.pValue.toFixed(4)}`);
      console.log(`  Classification: ${outlier.direction}`);
    }
  }

  console.log('\n');

  // Step 7: Analysis of decision patterns
  console.log('='.repeat(80));
  console.log('DECISION PATTERN ANALYSIS');
  console.log('='.repeat(80));
  console.log('\n');

  // Calculate agreement between decisions and outcomes
  let decisionOutcomeAgreement = 0;
  let totalWithDecisions = 0;

  for (const [appId, outcome] of applicationOutcomes) {
    for (const decision of outcome.decisions) {
      totalWithDecisions++;
      const positiveDecision = ['YES', 'MAYBE_YES'].includes(decision);
      if (positiveDecision === outcome.advanced) {
        decisionOutcomeAgreement++;
      }
    }
  }

  if (totalWithDecisions > 0) {
    const agreementRate = decisionOutcomeAgreement / totalWithDecisions;
    console.log(`Decision-Outcome Agreement Rate: ${(agreementRate * 100).toFixed(1)}%`);
    console.log(`(How often YES/MAYBE_YES leads to advancement and NO/MAYBE_NO doesn't)`);
    console.log('\n');
  }

  // Step 8: Variance analysis
  console.log('='.repeat(80));
  console.log('VARIANCE ANALYSIS');
  console.log('='.repeat(80));
  console.log('\n');

  const rates = evaluatorArray.map(e => e.advancementRate);
  const meanRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((sum, r) => sum + Math.pow(r - meanRate, 2), 0) / rates.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / meanRate;

  console.log(`Mean Advancement Rate: ${(meanRate * 100).toFixed(1)}%`);
  console.log(`Standard Deviation: ${(stdDev * 100).toFixed(1)}%`);
  console.log(`Coefficient of Variation: ${(coefficientOfVariation * 100).toFixed(1)}%`);
  console.log('\n');

  if (coefficientOfVariation > 0.3) {
    console.log('HIGH VARIABILITY DETECTED');
    console.log('The coefficient of variation exceeds 30%, suggesting substantial');
    console.log('differences in advancement rates across interviewers.');
  } else if (coefficientOfVariation > 0.15) {
    console.log('MODERATE VARIABILITY DETECTED');
    console.log('Some variation exists across interviewers, but it may be');
    console.log('within acceptable bounds for natural variation.');
  } else {
    console.log('LOW VARIABILITY');
    console.log('Interviewers appear to have relatively consistent advancement rates.');
  }

  console.log('\n');

  // Step 9: Summary and recommendations
  console.log('='.repeat(80));
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('\n');

  const hasSignificantBias = chiSquare > criticalValue || outliers.length > 0;

  if (hasSignificantBias) {
    console.log('FINDING: Evidence of potential interviewer bias detected.\n');

    if (outliers.length > 0) {
      const lenient = outliers.filter(o => o.direction === 'MORE LENIENT');
      const strict = outliers.filter(o => o.direction === 'MORE STRICT');

      if (lenient.length > 0) {
        console.log('More lenient interviewers:');
        lenient.forEach(o => console.log(`  - ${o.name} (${(o.advancementRate * 100).toFixed(1)}% advancement rate)`));
        console.log();
      }

      if (strict.length > 0) {
        console.log('More strict interviewers:');
        strict.forEach(o => console.log(`  - ${o.name} (${(o.advancementRate * 100).toFixed(1)}% advancement rate)`));
        console.log();
      }
    }

    console.log('RECOMMENDATIONS:');
    console.log('1. Review scoring rubrics and calibration training for interviewers');
    console.log('2. Consider requiring multiple interviewers per candidate');
    console.log('3. Implement blind review of borderline cases');
    console.log('4. Monitor interviewer patterns across future cycles');
  } else {
    console.log('FINDING: No statistically significant interviewer bias detected.\n');
    console.log('The data does not support the hypothesis that certain interviewers');
    console.log('give candidates an unfair advantage or disadvantage.');
    console.log('\nNOTE: This does not prove absence of bias, only that the current');
    console.log('sample size may be insufficient to detect it, or the effect is small.');
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('Analysis Complete');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

async function analyzeLegacyCoffeeChats(coffeeChats, cycle) {
  console.log('Analyzing legacy coffee chat data...\n');

  // Group by mentor name
  const mentorStats = new Map();

  for (const cc of coffeeChats) {
    const mentorName = cc.mentorName;

    if (!mentorStats.has(mentorName)) {
      mentorStats.set(mentorName, {
        total: 0,
        completed: 0,
        avgScore: 0,
        scores: []
      });
    }

    const stats = mentorStats.get(mentorName);
    stats.total++;
    if (cc.completed) stats.completed++;
    if (cc.overallScore) {
      stats.scores.push(parseFloat(cc.overallScore));
    }
  }

  // Calculate averages
  for (const [mentor, stats] of mentorStats) {
    if (stats.scores.length > 0) {
      stats.avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    }
  }

  console.log('Mentor Statistics:');
  console.log('-'.repeat(60));

  for (const [mentor, stats] of mentorStats) {
    console.log(`${mentor}: ${stats.total} chats, ${stats.completed} completed, avg score: ${stats.avgScore.toFixed(2)}`);
  }
}

main().catch(console.error);
