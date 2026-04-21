CREATE TABLE `challenge_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`userId` int NOT NULL,
	`habitId` int,
	`completionCount` int NOT NULL DEFAULT 0,
	`status` enum('invited','joined','declined') NOT NULL DEFAULT 'invited',
	`joinedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenge_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`title` varchar(128) NOT NULL,
	`description` text,
	`metric` varchar(128) NOT NULL,
	`targetValue` int NOT NULL DEFAULT 1,
	`targetType` enum('boolean','numeric') NOT NULL DEFAULT 'boolean',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`photoUrl` text,
	`aiSummary` text,
	`notes` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`foodPhotoEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `habits` ADD `timeOfDay` enum('any_time','morning','afternoon','nighttime','custom') DEFAULT 'any_time' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `customTime` varchar(5);--> statement-breakpoint
ALTER TABLE `habits` ADD `subGoalSteps` int DEFAULT 1 NOT NULL;