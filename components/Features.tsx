import React from 'react'

const Features = () => {
  return (
    <div className="relative w-full bg-[#f6faff] py-10 px-4 sm:px-6 lg:px-8 pt-10 lg:pt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
          {/* Feature 1 */}
          <div className="flex flex-col w-full lg:w-72 items-center gap-5">
            <img
              className="w-8 h-8"
              alt="Frame"
              src="https://c.animaapp.com/Y9Wb8hw1/img/frame.svg"
            />
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="font-medium text-black text-xl sm:text-2xl tracking-[-0.48px] leading-[28.8px]">
                Fast answers
              </div>
              <div className="text-gray-500 text-sm sm:text-base">
                instant estimate on upload
              </div>
            </div>
          </div>

          {/* Divider - Hidden on mobile */}
          <img
            className="hidden lg:block w-[1.5px] h-[72px] filter brightness-75"
            alt="Line"
            src="https://c.animaapp.com/Y9Wb8hw1/img/line-2.svg"
          />


          {/* Feature 2 */}
          <div className="flex flex-col w-full lg:w-72 items-center gap-5">
            <img
              className="w-8 h-8"
              alt="Frame"
              src="https://c.animaapp.com/Y9Wb8hw1/img/frame-1.svg"
            />
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="font-medium text-black text-xl sm:text-2xl tracking-[-0.48px] leading-[28.8px]">
                Transparent pricing
              </div>
              <div className="text-gray-500 text-sm sm:text-base">
                one clear breakdown
              </div>
            </div>
          </div>

          {/* Divider - Hidden on mobile */}
          <img
            className="hidden lg:block w-[1.5px] h-[72px] filter brightness-75"
            alt="Line"
            src="https://c.animaapp.com/Y9Wb8hw1/img/line-2.svg"
          />

          {/* Feature 3 */}
          <div className="flex flex-col w-full lg:w-72 items-center gap-5">
            <img
              className="w-8 h-8"
              alt="Frame"
              src="https://c.animaapp.com/Y9Wb8hw1/img/frame-2.svg"
            />
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="font-medium text-black text-xl sm:text-2xl tracking-[-0.48px] leading-[28.8px]">
                UK support
              </div>
              <p className="text-gray-500 text-sm sm:text-base">
                book a callback in minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Features