import { s } from "./schema.js";

describe("Database", () => {
  it("creates a basic schema", () => {
    expect(
      s.database({
        Todo: s.model({
          id: s.uuid().primary().autogenerate(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          text: s.text().default("text"),
          extra: s.text(),
        }),
      })
    ).toEqual({
      models: {
        Todo: {
          columns: {
            id: expect.anything(),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
            text: expect.anything(),
            extra: expect.anything(),
          },
          relations: {},
          name: "Todo",
          tableName: "todos",
        },
      },
    });
  });

  it("describes relations", () => {
    expect(
      s.database({
        User: s.model({
          id: s.uuid().primary().autogenerate(),
          avatar: s.hasOne("id", "Avatar", "userId"),
          posts: s.hasMany("id", "Post", "userId"),
        }),
        Avatar: s.model({
          userId: s.uuid().unique(),
          user: s.belongsTo("userId", "User", "id"),
        }),
        Post: s.model({
          userId: s.uuid(),
          user: s.belongsTo("userId", "User", "id"),
        }),
      })
    ).toMatchObject({
      models: {
        User: {
          relations: {
            posts: {
              relationType: "hasMany",
              column: "id",
              foreignModel: { name: "Post" },
              foreignColumn: "userId",
            },
          },
        },
        Post: {
          relations: {
            user: {
              relationType: "belongsTo",
              column: "userId",
              foreignModel: { name: "User" },
              foreignColumn: "id",
            },
          },
        },
      },
    });
  });

  it("validates identifiers", () => {
    expect(() =>
      s.database({
        "test model": s.model({
          "test column": s.text(),
        }),
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid identifier\\",
          \\"path\\": [
            \\"models\\",
            \\"test model\\",
            \\"name\\"
          ]
        },
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid identifier\\",
          \\"path\\": [
            \\"models\\",
            \\"test model\\",
            \\"columns\\",
            \\"test column\\",
            \\"name\\"
          ]
        }
      ]"
    `);
  });

  it("validates references", () => {
    expect(() =>
      s.database({
        User: s.model({
          id: s.uuid().primary().autogenerate(),
        }),

        Message: s.model({
          id: s.uuid().primary().autogenerate(),
          groupId: s.uuid(),
          senderId: s.uuid(),
          recipientId: s.integer(),
          workspace: s.belongsTo("workspaceId", "User", "id"),
          group: s.belongsTo("groupId", "Group", "id"),
          sender: s.belongsTo("senderId", "User", "uuid"),
          recipient: s.belongsTo("recipientId", "User", "id"),
        }),
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"path\\": [
            \\"models\\",
            \\"Message\\",
            \\"relations\\",
            \\"workspace\\",
            \\"column\\"
          ],
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid local column\\"
        },
        {
          \\"path\\": [
            \\"models\\",
            \\"Message\\",
            \\"relations\\",
            \\"group\\",
            \\"foreignModel\\"
          ],
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid foreign model\\"
        },
        {
          \\"path\\": [
            \\"models\\",
            \\"Message\\",
            \\"relations\\",
            \\"sender\\",
            \\"foreignColumn\\"
          ],
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid foreign column\\"
        },
        {
          \\"path\\": [
            \\"models\\",
            \\"Message\\",
            \\"relations\\",
            \\"recipient\\"
          ],
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Local and foreign columns have different types\\"
        }
      ]"
    `);
  });
});

describe("ModelBuilder", () => {
  it("can add timestamps", () => {
    expect(() =>
      s.model({ id: s.uuid().primary() }).withTimestamps().build("tbl")
    ).not.toThrow();
  });

  it("can specify a table name", () => {
    expect(
      s.model({ id: s.uuid().primary() }).inTable("anotherTable").build("tbl")
    ).toMatchObject({ name: "tbl", tableName: "anotherTable" });
  });
});
