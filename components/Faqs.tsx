import { useState } from "react";

interface FAQItem {
  id: number;
  question: string;
  answer?: string;
}

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqData: FAQItem[] = [
    {
      id: 1,
      question: "Can you read any statement?",
      answer:
        "Yes. We support all major merchant services providers automatically, and our system can read most PDF or image-based statements using AI.",
    },
    {
      id: 2,
      question: "What happens to my data?",
      answer:
        "We process your file solely to generate your estimate and produce your personalised quote.",
    },
    {
      id: 3,
      question: "How do I switch to the better deal?",
      answer:
        "Use the calendar at the bottom of our homepage - or the link included in your quote email - to book a call. One of our team members will walk you through the switch.",
    },
    {
      id: 4,
      question: "Are there any hidden fees?",
      answer:
        "No. There are no hidden fees. Everything you pay will be clearly displayed on your quote email.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="relative w-full bg-[#f6faff] py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-8 sm:gap-12 lg:gap-[60px]">
        <header className="flex flex-col items-center gap-3 w-full">
          <h1 className="font-['Inter_Tight',Helvetica] font-semibold text-dark text-4xl text-center tracking-[-0.80px] leading-tight sm:leading-12">
            Frequently Asked Questions
          </h1>
        </header>

        <section
          className="flex flex-col items-center gap-3 w-full"
          role="region"
          aria-label="Frequently Asked Questions"
        >
          {faqData.map((faq, index) => (
            <article
              key={faq.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 w-full lg:w-[60vw] bg-white rounded-2xl border border-solid border-[#0a0d111a] transition-all duration-300"
            >
              <div className="flex flex-col items-start gap-2 flex-1 w-full">
                <div className="flex items-center justify-between w-full sm:w-auto sm:block">
                  <h2 className="font-medium text-base sm:text-lg text-[#0a0d11] leading-relaxed pr-4 sm:pr-0">
                    {faq.question}
                  </h2>

                  {/* Mobile button - visible only on mobile */}
                  <button
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={openIndex === index}
                    aria-label={
                      openIndex === index
                        ? `Collapse ${faq.question}`
                        : `Expand ${faq.question}`
                    }
                    className="sm:hidden relative w-5 h-5 flex items-center justify-center shrink-0"
                  >
                    <img
                      className="relative w-5 h-5"
                      alt={openIndex === index ? "Minus icon" : "Plus icon"}
                      src={
                        openIndex === index
                          ? "https://c.animaapp.com/mK2B0Gpi/img/minus-icon.svg"
                          : "https://c.animaapp.com/mK2B0Gpi/img/plus-icon-2.svg"
                      }
                    />
                  </button>
                </div>

                {openIndex === index && faq.answer && (
                  <div className="w-full overflow-hidden transition-all duration-300 ease-in-out">
                    <p className="text-sm sm:text-base text-[#525966] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop button - visible only on desktop */}
              <button
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
                aria-label={
                  openIndex === index
                    ? `Collapse ${faq.question}`
                    : `Expand ${faq.question}`
                }
                className="hidden sm:flex relative w-5 h-5 items-center justify-center shrink-0"
              >
                <img
                  className="relative w-5 h-5"
                  alt={openIndex === index ? "Minus icon" : "Plus icon"}
                  src={
                    openIndex === index
                      ? "https://c.animaapp.com/mK2B0Gpi/img/minus-icon.svg"
                      : "https://c.animaapp.com/mK2B0Gpi/img/plus-icon-2.svg"
                  }
                />
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Faqs;
