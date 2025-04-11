"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Trash2, Eye } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  deleteDefenseSession,
  deleteFeedback,
} from "@/lib/actions/general.action";
import { Interview } from "@/types";

interface DefenseSessionsProps {
  sessions: Interview[] | undefined;
  userId: string | undefined;
}

const DefenseSessions = ({ sessions = [], userId }: DefenseSessionsProps) => {
  const router = useRouter();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteConfirm = (sessionId: string) => {
    setConfirmDelete(sessionId);
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  const handleDeleteSession = async (
    sessionId: string,
    feedbackId?: string
  ) => {
    try {
      setDeletingSessionId(sessionId);
      setConfirmDelete(null);

      // Delete feedback if it exists
      if (feedbackId) {
        const feedbackResult = await deleteFeedback(feedbackId);
        if (!feedbackResult.success) {
          throw new Error("Failed to delete feedback");
        }
      }

      // Delete the session
      const sessionResult = await deleteDefenseSession(sessionId);
      if (!sessionResult.success) {
        throw new Error("Failed to delete session");
      }

      toast.success("Session deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setDeletingSessionId(null);
    }
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p>No defense sessions found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="card-border p-0.5 rounded-2xl relative group hover:shadow-lg transition-shadow duration-300"
        >
          <div className="card dark-gradient rounded-2xl p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-2">{session.role}</h3>
                <p className="text-sm text-gray-400 mb-1">
                  Level: {session.level}
                </p>
                <p className="text-sm text-gray-400">Type: {session.type}</p>
              </div>
              <Image
                src={session.coverImage || '/placeholder-image.png'}
                alt="session cover"
                width={80}
                height={80}
                className="rounded-lg"
              />
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Technologies:</p>
              <div className="flex flex-wrap gap-2">
                {session.techstack && session.techstack.length > 0 ? (
                  session.techstack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-dark-200 rounded-full text-xs"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 bg-dark-200 rounded-full text-xs">
                    Not specified
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => router.push(`/interview/${session.id}`)}
              >
                <Eye size={16} />
                View Details
              </button>
              <button
                className={cn(
                  "btn-secondary flex items-center gap-2",
                  deletingSessionId === session.id &&
                    "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleDeleteConfirm(session.id)}
                disabled={deletingSessionId === session.id}
              >
                <Trash2 size={16} />
                {deletingSessionId === session.id ? "Deleting..." : "Delete"}
              </button>
            </div>

            {/* Delete confirmation overlay */}
            {confirmDelete === session.id && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                <div className="bg-dark-200 p-4 rounded-lg text-center">
                  <p className="text-white mb-4">Are you sure you want to delete this session?</p>
                  <div className="flex gap-2 justify-center">
                    <button 
                      className="px-4 py-2 bg-red-600 text-white rounded-md"
                      onClick={() => handleDeleteSession(session.id, session.feedbackId)}
                    >
                      Yes, Delete
                    </button>
                    <button 
                      className="px-4 py-2 bg-gray-600 text-white rounded-md"
                      onClick={handleDeleteCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {deletingSessionId === session.id && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                <div className="bg-dark-200 p-4 rounded-lg text-center">
                  <p className="text-white mb-2">Deleting session...</p>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DefenseSessions;
