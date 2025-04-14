import { Search } from "lucide-react";
import Link from "next/link";
import { Input } from "./input";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "./navigation-menu";

const Navbar = () => {
	return (
		<nav className="border-b px-4 py-3">
			<div className="max-w-screen-2xl mx-auto flex items-center justify-between">
				<div className="flex items-center gap-6">
					<h1 className="text-xl font-bold">Logo</h1>
					<NavigationMenu>
						<NavigationMenuList>
							<NavigationMenuItem>
								<NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
								<NavigationMenuContent>
									<ul className="grid gap-3 p-4 w-[400px]">
										<li className="row-span-3">
											<NavigationMenuLink asChild>
												<Link
													href="/"
													className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
												>
													<div className="mb-2 mt-4 text-lg font-medium">Welcome</div>
													<p className="text-sm leading-tight text-muted-foreground">
														Explore our dashboard and analytics tools.
													</p>
												</Link>
											</NavigationMenuLink>
										</li>
									</ul>
								</NavigationMenuContent>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
				</div>
				<div className="relative">
					<Input type="search" placeholder="Search by address/txn hash/block number..." className="pl-8 w-96" />
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
