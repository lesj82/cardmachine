const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-200 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 text-sm text-gray-600">
          
          {/* Left: Logo + Email */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo2.png"
                alt="CardMachineQuote.com Logo"
                className="w-32 h-auto"
              />
            </div>
            <a 
              href="mailto:quotes@cardmachinequote.com" 
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              quotes@cardmachinequote.com
            </a>
          </div>

          {/* Center: Copyright */}
          <div className="text-center md:text-left">
            <span className="text-gray-600">
              © {new Date().getFullYear()} CardMachineQuote.com
            </span>
          </div>

          {/* Right: Links */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <a 
              href="/privacy" 
              className="text-gray-600 hover:text-indigo-600 transition-colors hover:underline"
            >
              Privacy Policy
            </a>
            <a 
              href="/terms" 
              className="text-gray-600 hover:text-indigo-600 transition-colors hover:underline"
            >
              Terms & Conditions
            </a>
          </div>
          
        </div>
      </div>
    </footer>
  )
}

export default Footer
