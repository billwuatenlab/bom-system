-- BOM System — MSSQL 資料庫初始化
-- 在 SQL Server Management Studio (SSMS) 中執行此腳本

-- 1. 建立資料庫
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BOM')
BEGIN
    CREATE DATABASE BOM;
    PRINT 'Database BOM created.';
END
ELSE
BEGIN
    PRINT 'Database BOM already exists.';
END
GO

-- 2. 建立登入帳號 (如果不使用 SA)
USE [master]
GO

IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'BomAdmin')
BEGIN
    CREATE LOGIN [BomAdmin] WITH PASSWORD = 'BomSystem@2026';
    PRINT 'Login BomAdmin created.';
END
GO

-- 3. 建立資料庫使用者
USE [BOM]
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'BomAdmin')
BEGIN
    CREATE USER [BomAdmin] FOR LOGIN [BomAdmin];
    ALTER ROLE [db_owner] ADD MEMBER [BomAdmin];
    PRINT 'User BomAdmin created with db_owner role.';
END
GO

PRINT 'MSSQL setup complete.';
GO
