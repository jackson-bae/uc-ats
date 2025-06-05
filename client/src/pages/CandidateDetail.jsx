import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

// Mock data for now — replace this with actual API later
const mockCandidates = [
  {
    id: "1",
    name: "Alice Johnson",
    year: "Sophomore",
    major: "Computer Science",
    status: "Pending",
    email: "alice@example.com",
    resumeLink: "https://example.com/resume-alice.pdf",
    notes: "Interested in design and outreach roles.",
  },
  {
    id: "2",
    name: "Bob Smith",
    year: "Junior",
    major: "EE",
    status: "Accepted",
    email: "bob@example.com",
    resumeLink: "https://example.com/resume-bob.pdf",
    notes: "Strong resume, prior project experience.",
  },
];

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    // Replace with fetch from backend later
    const found = mockCandidates.find((c) => c.id === id);
    setCandidate(found);
  }, [id]);

  if (!candidate) {
    return <div className="p-4">Candidate not found.</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow rounded-xl">
      <h2 className="text-2xl font-bold mb-4">{candidate.name}</h2>
      <div className="space-y-2">
        <p><strong>Year:</strong> {candidate.year}</p>
        <p><strong>Major:</strong> {candidate.major}</p>
        <p><strong>Email:</strong> {candidate.email}</p>
        <p><strong>Status:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{candidate.status}</span></p>
        <p><strong>Notes:</strong> {candidate.notes}</p>
        <a
          href={candidate.resumeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Resume
        </a>
      </div>
    </div>
  );
}