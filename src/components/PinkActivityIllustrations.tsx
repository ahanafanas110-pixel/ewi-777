import React from 'react';

export const PinkGiftIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-full'
}) => {
  return (
    <img
      src="/assets/aistudio/image_ca502d87.png"
      alt="Gifts & Red Packet Rewards"
      className={`${className} object-cover object-center block select-none`}
      draggable={false}
    />
  );
};

export const PinkAttendanceIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-full'
}) => {
  return (
    <img
      src="/assets/aistudio/image_8ac2ec5a.png"
      alt="Daily Sign In Attendance Rewards"
      className={`${className} object-cover object-center block select-none`}
      draggable={false}
    />
  );
};
