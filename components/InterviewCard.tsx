"use client";

import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";

import { cn, getRandomInterviewCover } from "@/lib/utils";
import {
  getFeedbackByInterviewId,
  deleteDefenseSession,
  deleteFeedback,
} from "@/lib/actions/general.action";

const InterviewCard = ({
  interviewId,
  userId,
  role,
  type,
  techstack = [],
  createdAt,
  onDelete,
}: InterviewCardProps & { onDelete: (id: string) => void }) => {
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (userId && interviewId) {
        try {
          const feedbackData = await getFeedbackByInterviewId({
            interviewId,
            userId,
          });
          setFeedback(feedbackData);
        } catch (error) {
          console.error("Error fetching feedback:", error);
        }
      }
    };
    fetchFeedback();
  }, [userId, interviewId]);

  const badgeColor =
    {
      "Bachelor's Defense": "bg-light-400",
      "Master's Defense": "bg-light-600",
      "PhD Defense": "bg-light-800",
    }[type] || "bg-light-600";

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now()
  ).format("MMM D, YYYY");

  const handleConfirmDelete = () => {
    setShowConfirmation(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      if (feedback?.id) {
        const feedbackResult = await deleteFeedback(feedback.id);
        if (!feedbackResult.success) {
          throw new Error("Failed to delete feedback");
        }
      }

      const sessionResult = await deleteDefenseSession(interviewId);
      if (!sessionResult.success) {
        throw new Error("Failed to delete session");
      }

      toast.success("Session deleted successfully");

      // Call the onDelete function to update parent component state
      if (onDelete) {
        onDelete(interviewId);
      }

      // Force page refresh to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setDeleting(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="card-border w-[360px] max-sm:w-full min-h-96 relative">
      <div className="card-interview">
        <div>
          {/* Type Badge */}
          <div
            className={cn(
              "absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg",
              badgeColor
            )}
          >
            <p className="badge-text ">{type}</p>
          </div>

          {/* Cover Image */}
          <Image
            src="/robot.png"
            alt="cover-image"
            width={90}
            height={90}
            className="rounded-full object-cover size-[90px]"
          />

          {/* Project Title */}
          <h3 className="mt-5 capitalize">{role}</h3>

          {/* Date & Score */}
          <div className="flex flex-row gap-5 mt-3">
            <div className="flex flex-row gap-2">
              <Image
                src="/calendar.svg"
                width={22}
                height={22}
                alt="calendar"
              />
              <p>{formattedDate}</p>
            </div>

            <div className="flex flex-row gap-2 items-center">
              <Image src="/star.svg" width={22} height={22} alt="star" />
              <p>{feedback?.totalScore || "---"}/100</p>
            </div>
          </div>

          {/* Feedback or Placeholder Text */}
          <p className="line-clamp-2 mt-5">
            {feedback?.finalAssessment ||
              "You haven't participated in this defense session yet. Start now to improve your project defense skills."}
          </p>
        </div>

        <div className="flex flex-row justify-between">
          <DisplayTechIcons techStack={techstack} />
          <div className="flex gap-2">
            <Button className="btn-primary">
              <Link
                href={
                  feedback
                    ? `/interview/${interviewId}/feedback`
                    : `/interview/${interviewId}`
                }
              >
                {feedback ? "View Feedback" : "Start Defense"}
              </Link>
            </Button>
            <Button
              className="btn-secondary flex items-center gap-2"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showConfirmation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center z-10">
          <div className="bg-dark-200 p-6 rounded-lg text-center max-w-xs">
            <p className="text-white mb-4">
              Are you sure you want to delete this session?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewCard;
