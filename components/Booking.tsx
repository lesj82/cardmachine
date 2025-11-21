import CalendlyEmbed from './CalendlyEmbed';

const Booking = () => {
  return (
    <section className="py-24 bg-white w-full">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            Book a callback
          </h2>
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