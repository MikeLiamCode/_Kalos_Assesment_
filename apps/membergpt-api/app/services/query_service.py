from sqlalchemy import text


def answer_from_sql(db, question: str) -> str:
    q = question.lower().strip()

    member_names = ["sarah", "jordan", "maria", "david"]

    def find_member_name():
        for name in member_names:
            if name in q:
                return name
        return None

    # 1) Count members with 3+ scans
    if "how many members" in q and ("3+ scans" in q or "3 scans" in q or "3 or more scans" in q):
        result = db.execute(text("""
            SELECT COUNT(*)
            FROM (
              SELECT m.id
              FROM "Member" m
              JOIN "Scan" s ON s."memberId" = m.id
              GROUP BY m.id
              HAVING COUNT(s.id) >= 3
            ) t
        """)).scalar()
        return f"{result} members have had 3 or more scans."

    # 2) Members who lost lean mass between last two scans
    if "lost lean mass" in q:
        rows = db.execute(text("""
            WITH ranked AS (
              SELECT
                m."fullName",
                s."leanMassKg",
                s."scanDate",
                ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY s."scanDate" DESC) AS rn
              FROM "Member" m
              JOIN "Scan" s ON s."memberId" = m.id
            )
            SELECT a."fullName"
            FROM ranked a
            JOIN ranked b ON a."fullName" = b."fullName"
            WHERE a.rn = 1
              AND b.rn = 2
              AND a."leanMassKg" < b."leanMassKg"
        """)).fetchall()

        if not rows:
            return "No members have lost lean mass between their last two scans."

        names = ", ".join(row[0] for row in rows)
        return f"These members lost lean mass between their last two scans: {names}."

    # 3) Current body fat / latest scan value
    if "body fat" in q and any(term in q for term in ["today", "current", "latest", "now"]):
        name = find_member_name()
        if not name:
            return "Please specify which member you want me to check."

        row = db.execute(text("""
            SELECT m."fullName", s."scanDate", s."bodyFatPercent"
            FROM "Scan" s
            JOIN "Member" m ON m.id = s."memberId"
            WHERE lower(m."fullName") LIKE :name
            ORDER BY s."scanDate" DESC
            LIMIT 1
        """), {"name": f"%{name}%"}).fetchone()

        if not row:
            return "I could not find scan data for that member."

        return (
            f"{row[0]}'s latest recorded body fat is {row[2]:.1f}% "
            f"from the scan on {row[1].strftime('%Y-%m-%d')}."
        )

    # 4) Body fat trend / trends / trended
    if "body fat" in q and any(term in q for term in ["trend", "trends", "trended"]):
        name = find_member_name()
        if not name:
            return "Please specify which member you want me to check."

        rows = db.execute(text("""
            SELECT s."scanDate", s."bodyFatPercent"
            FROM "Scan" s
            JOIN "Member" m ON m.id = s."memberId"
            WHERE lower(m."fullName") LIKE :name
            ORDER BY s."scanDate" ASC
        """), {"name": f"%{name}%"}).fetchall()

        if not rows:
            return "I could not find scan data for that member."

        if len(rows) == 1:
            only = rows[0]
            return (
                f"{name.title()} only has one scan so there is no trend yet. "
                f"The current recorded body fat is {only[1]:.1f}% on {only[0].strftime('%Y-%m-%d')}."
            )

        trend = "; ".join(f"{r[0].strftime('%Y-%m-%d')}: {r[1]:.1f}%" for r in rows)
        return f"Body fat trend for {name.title()}: {trend}."

    # 5) Coaching focus
    if "focus on" in q and "next coaching session" in q:
        name = find_member_name()
        if not name:
            return "Please specify which member you want me to check."

        rows = db.execute(text("""
            SELECT s."weightKg", s."bodyFatPercent", s."fatMassKg", s."leanMassKg"
            FROM "Scan" s
            JOIN "Member" m ON m.id = s."memberId"
            WHERE lower(m."fullName") LIKE :name
            ORDER BY s."scanDate" DESC
            LIMIT 2
        """), {"name": f"%{name}%"}).fetchall()

        if len(rows) < 2:
            return (
                f"{name.title()} only has one scan, so I would focus on education, "
                f"baseline interpretation, and consistency habits before making aggressive changes."
            )

        latest, prev = rows[0], rows[1]
        lean_delta = latest[3] - prev[3]
        fat_delta = latest[2] - prev[2]

        if lean_delta < 0:
            return (
                f"For {name.title()}, I would focus on preserving or rebuilding lean mass because "
                f"their latest scan shows a lean mass drop of {abs(lean_delta):.1f} kg since the previous scan."
            )

        if fat_delta > 0:
            return (
                f"For {name.title()}, I would focus on nutrition adherence and activity consistency because "
                f"fat mass increased by {fat_delta:.1f} kg since the previous scan."
            )

        return (
            f"For {name.title()}, I would reinforce what is already working: "
            f"body fat is improving and lean mass is stable or improving between the last two scans."
        )

    return (
        "I can only answer questions grounded in the scan data. "
        "Try asking about current body fat, body fat trends, lean mass changes, "
        "scan counts, or coaching focus for Sarah, Jordan, Maria, or David."
    )