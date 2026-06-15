"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setVisible(window.scrollY > 300);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const scrollTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	if (!visible) return null;

	return (
		<button
			onClick={scrollTop}
			aria-label="Scroll to top"
			className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-transform transform hover:scale-105 w-12 h-12 flex items-center justify-center"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
				<path fillRule="evenodd" d="M11.47 3.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 5.81l-6.97 6.47a.75.75 0 1 1-1.06-1.06l7.5-7.5Z" clipRule="evenodd" />
				<path d="M12 4.5a.75.75 0 0 1 .75.75v14.5a.75.75 0 0 1-1.5 0V5.25A.75.75 0 0 1 12 4.5Z" />
			</svg>
		</button>
	);
}
























