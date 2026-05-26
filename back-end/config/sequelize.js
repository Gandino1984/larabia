import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        dialect: "mysql",
        timezone: '+00:00',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        dialectOptions: {
            timezone: '+00:00',
            dateStrings: true,
            typeCast: true,
            charset: 'utf8mb4',
            collation: 'utf8mb4_unicode_ci',
            connectTimeout: 60000,
            flags: '-FOUND_ROWS'
        },
        define: {
            timestamps: false,
            freezeTableName: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    }
);

async function initialize() {
    try {
        await sequelize.authenticate();
        await sequelize.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
        await sequelize.query("SET CHARACTER SET utf8mb4");
        console.log('*********************************************************************');
        console.log('** SEQUELIZE: conexión a la base de datos establecida (larabia)    **');
        console.log('*********************************************************************');
    } catch (error) {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('SEQUELIZE: error en la conexión a la base de datos', error);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        throw error;
    }
}

initialize();

export default sequelize;
