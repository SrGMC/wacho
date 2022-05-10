const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    storage: 'db.sqlite',
});

const Party = sequelize.define('Party', {
    id: {
        type: DataTypes.STRING,
        unique: true,
        primaryKey: true,
        allowNull: false,
    },
});

const Item = sequelize.define('Item', {
    tmdbId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    addedBy: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
    },
    viewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    skipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
});

Party.hasMany(Item, { foreignKey: { name: 'partyId', allowNull: false } });

const RateLimits = sequelize.define(
    'RateLimits',
    {
        Route: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        Source: {
            type: Sequelize.TEXT,
            allowNull: false,
            primaryKey: true,
        },
        Count: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        TTL: {
            type: Sequelize.BIGINT,
            allowNull: false,
        },
    },
    {
        freezeTableName: true,
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['Route', 'Source'],
            },
        ],
    }
);

async function sync() {
    await sequelize.sync();
}

exports.Party = Party;
exports.Item = Item;
exports.RateLimits = RateLimits;
exports.sequelize = sequelize;
exports.sync = sync;
