import CalendlyEmbed from './CalendlyEmbed';

const Booking = () => {
  return (
    <section className="py-24 bg-white w-full">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-['Inter_Tight',Helvetica] font-semibold text-dark text-4xl text-center tracking-[-0.80px] leading-tight sm:leading-12">
            Book a callback
          </h1>
          <p className="text-slate-500">
            Prefer to talk? Choose a slot that suits you.
          </p>
        </div>
        <CalendlyEmbed />        
      </div>
    </section>
  );
};

export default Booking