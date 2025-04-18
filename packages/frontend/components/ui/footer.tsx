const Footer = () => {
	return (
		<footer className="bg-white border-t px-4 py-3">
			<div className="flex justify-between items-center">
				<p className="text-sm text-gray-600">© {new Date().getFullYear()} All rights reserved.</p>
				<a
					href="https://github.com/rinchan01/mev-detection"
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm text-blue-600 hover:text-blue-800"
				>
					GitHub
				</a>
			</div>
		</footer>
	);
};

export default Footer;
