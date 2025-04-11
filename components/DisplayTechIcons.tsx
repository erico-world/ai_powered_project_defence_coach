"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn, getTechLogos } from "@/lib/utils";

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
  const [techIcons, setTechIcons] = useState<{ tech: string; url: string }[]>(
    []
  );

  useEffect(() => {
    const fetchTechIcons = async () => {
      // Handle case when techStack is undefined or null
      if (!techStack || !Array.isArray(techStack) || techStack.length === 0) {
        setTechIcons([]);
        return;
      }

      const icons = await getTechLogos(techStack);
      setTechIcons(icons);
    };

    fetchTechIcons();
  }, [techStack]);

  // If no tech stack, render empty div
  if (!techStack || !Array.isArray(techStack) || techStack.length === 0) {
    return <div className="flex flex-row"></div>;
  }

  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex flex-center",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip">{tech}</span>

          <Image
            src={url || "/tech.svg"}
            alt={tech}
            width={100}
            height={100}
            className="size-5"
          />
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
