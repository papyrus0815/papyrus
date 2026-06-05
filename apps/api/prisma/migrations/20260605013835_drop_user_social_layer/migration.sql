/*
  Warnings:

  - You are about to drop the column `post_id` on the `glossary_term` table. All the data in the column will be lost.
  - You are about to drop the `comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `follow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `like` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_parent_id_fkey`;

-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `follow` DROP FOREIGN KEY `follow_follower_id_fkey`;

-- DropForeignKey
ALTER TABLE `follow` DROP FOREIGN KEY `follow_following_id_fkey`;

-- DropForeignKey
ALTER TABLE `glossary_term` DROP FOREIGN KEY `glossary_term_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `like_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `like_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `post` DROP FOREIGN KEY `post_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_room` DROP FOREIGN KEY `user_room_user_id_fkey`;

-- DropIndex
DROP INDEX `idx_glossary_term_postId` ON `glossary_term`;

-- AlterTable
ALTER TABLE `glossary_term` DROP COLUMN `post_id`;

-- DropTable
DROP TABLE `comment`;

-- DropTable
DROP TABLE `follow`;

-- DropTable
DROP TABLE `like`;

-- DropTable
DROP TABLE `post`;

-- DropTable
DROP TABLE `user`;

-- DropTable
DROP TABLE `user_room`;
