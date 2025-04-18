import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BadgeDollarSignIcon, BookUserIcon, HouseIcon, SandwichIcon, ZapIcon } from "lucide-react";

const items = [
	{
		title: "Home",
		url: "/",
		icon: HouseIcon,
	},
	{
		title: "Address",
		url: "/address",
		icon: BookUserIcon,
	},
	{
		title: "Arbitrage",
		url: "/arbitrage",
		icon: BadgeDollarSignIcon,
	},
	{
		title: "Sandwiches",
		url: "/sandwich",
		icon: SandwichIcon,
	},
	{
		title: "Liquidation",
		url: "/liquidation",
		icon: ZapIcon,
	},
];

const CustomSidebar = () => {
	return (
		<Sidebar>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>MEV Detection</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
};

export default CustomSidebar;
