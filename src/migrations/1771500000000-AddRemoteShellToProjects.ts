import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRemoteShellToProjects1771500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "remote_shell" varchar(255) DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "remote_shell"`
    );
  }
}
