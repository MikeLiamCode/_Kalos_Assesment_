from sqlalchemy import text


MEMBER_NAMES = ["sarah", "jordan", "maria", "david"]


def _normalize(question: str) -> str:
    return (question or "").lower().strip()


def _find_member_name(q: str):
    for name in MEMBER_NAMES:
        if name in q:
            return name
    return None


def _get_scan_rows(db, member_name: str):
    return db.execute(
        text("""
            SELECT
                m."fullName",
                s."scanDate",
                s."weightKg",
                s."bodyFatPercent",
                s."fatMassKg",
                s."leanMassKg"
            FROM "Scan" s
            JOIN "Member" m ON m.id = s."memberId"
            WHERE lower(m."fullName") LIKE :name
            ORDER BY s."scanDate" ASC
        """),
        {"name": f"%{member_name}%"},
    ).fetchall()


def _format_scan_line(row):
    return (
        f"{row[1].strftime('%Y-%m-%d')}: "
        f"weight {row[2]:.1f} kg, "
        f"body fat {row[3]:.1f}%, "
        f"fat mass {row[4]:.1f} kg, "
        f"lean mass {row[5]:.1f} kg"
    )


def _member_summary(db, member_name: str):
    rows = _get_scan_rows(db, member_name)
    if not rows:
        return "I could not find scan data for that member."

    full_name = rows[-1][0]
    latest = rows[-1]
    scan_count = len(rows)

    summary = [
        f"{full_name} has {scan_count} recorded scan{'s' if scan_count != 1 else ''}.",
        (
            f"Latest scan on {latest[1].strftime('%Y-%m-%d')}: "
            f"weight {latest[2]:.1f} kg, "
            f"body fat {latest[3]:.1f}%, "
            f"fat mass {latest[4]:.1f} kg, "
            f"lean mass {latest[5]:.1f} kg."
        ),
    ]

    if len(rows) >= 2:
        prev = rows[-2]
        summary.append(
            "Compared with the previous scan, "
            f"weight changed by {latest[2] - prev[2]:+.1f} kg, "
            f"body fat changed by {latest[3] - prev[3]:+.1f} percentage points, "
            f"fat mass changed by {latest[4] - prev[4]:+.1f} kg, "
            f"lean mass changed by {latest[5] - prev[5]:+.1f} kg."
        )

    summary.append(
        "You can ask about latest values, previous scan values, trends, scan counts, "
        "or coaching focus for this member."
    )
    return " ".join(summary)


def answer_from_sql(db, question: str) -> str:
    q = _normalize(question)
    member_name = _find_member_name(q)

    # 1) General count: members with 3+ scans
    if (
        ("how many members" in q or "number of members" in q or "count members" in q)
        and ("3+ scans" in q or "3 scans" in q or "3 or more scans" in q)
    ):
        result = db.execute(
            text("""
                SELECT COUNT(*)
                FROM (
                  SELECT m.id
                  FROM "Member" m
                  JOIN "Scan" s ON s."memberId" = m.id
                  GROUP BY m.id
                  HAVING COUNT(s.id) >= 3
                ) t
            """)
        ).scalar()
        return f"{result} members have had 3 or more scans."

    # 2) Lost lean mass between last two scans
    if "lost lean mass" in q or ("lean mass" in q and "who" in q and "lost" in q):
        rows = db.execute(
            text("""
                WITH ranked AS (
                  SELECT
                    m."fullName",
                    s."leanMassKg",
                    s."scanDate",
                    ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY s."scanDate" DESC) AS rn
                  FROM "Member" m
                  JOIN "Scan" s ON s."memberId" = m.id
                )
                SELECT a."fullName", a."leanMassKg", b."leanMassKg"
                FROM ranked a
                JOIN ranked b ON a."fullName" = b."fullName"
                WHERE a.rn = 1
                  AND b.rn = 2
                  AND a."leanMassKg" < b."leanMassKg"
            """)
        ).fetchall()

        if not rows:
            return "No members have lost lean mass between their last two scans."

        details = ", ".join(
            f"{row[0]} ({abs(row[1] - row[2]):.1f} kg decrease)" for row in rows
        )
        return f"These members lost lean mass between their last two scans: {details}."

    # If member not found but question looks member-specific
    if not member_name and any(name_hint in q for name_hint in ["body fat", "lean mass", "scan", "trend", "focus", "coaching"]):
        return (
            "Please specify which member you want me to check. "
            "I can help with Sarah, Jordan, Maria, or David."
        )

    # Nothing member-specific left to do
    if not member_name:
        return (
            "I can answer questions grounded in the scan data, such as latest body fat, "
            "previous scan values, trends, scan counts, lean mass changes, and coaching focus "
            "for Sarah, Jordan, Maria, or David."
        )

    rows = _get_scan_rows(db, member_name)
    if not rows:
        return "I could not find scan data for that member."

    full_name = rows[-1][0]
    latest = rows[-1]
    previous = rows[-2] if len(rows) >= 2 else None
    oldest = rows[0]

    # 3) Latest/current/today/now body fat
    if "body fat" in q and any(term in q for term in ["today", "current", "latest", "now"]):
        return (
            f"{full_name}'s latest recorded body fat is {latest[3]:.1f}% "
            f"from the scan on {latest[1].strftime('%Y-%m-%d')}."
        )

    # 4) Previous / before last body fat
    if "body fat" in q and any(term in q for term in ["before the last scan", "previous scan", "prior scan", "before last"]):
        if not previous:
            return f"{full_name} has only one scan, so there is no previous body fat value yet."
        return (
            f"Before the latest scan, {full_name}'s body fat was {previous[3]:.1f}% "
            f"on {previous[1].strftime('%Y-%m-%d')}."
        )

    # 5) Body fat metrics / body fat summary
    if "body fat" in q and any(term in q for term in ["metric", "metrics", "summary", "data"]):
        parts = [
            f"{full_name}'s body fat history has {len(rows)} scan{'s' if len(rows) != 1 else ''}.",
            f"Latest body fat: {latest[3]:.1f}% on {latest[1].strftime('%Y-%m-%d')}.",
            f"First recorded body fat: {oldest[3]:.1f}% on {oldest[1].strftime('%Y-%m-%d')}.",
        ]
        if previous:
            parts.append(
                f"Previous body fat: {previous[3]:.1f}% on {previous[1].strftime('%Y-%m-%d')}."
            )
            parts.append(
                f"Change from previous to latest: {latest[3] - previous[3]:+.1f} percentage points."
            )
        parts.append(
            f"Overall change from first to latest: {latest[3] - oldest[3]:+.1f} percentage points."
        )
        return " ".join(parts)

    # 6) Body fat trend / trends / history / progression
    if "body fat" in q and any(term in q for term in ["trend", "trends", "history", "progress", "progression"]):
        if len(rows) == 1:
            return (
                f"{full_name} only has one scan so there is no trend yet. "
                f"The current recorded body fat is {latest[3]:.1f}% on {latest[1].strftime('%Y-%m-%d')}."
            )

        trend = "; ".join(
            f"{row[1].strftime('%Y-%m-%d')}: {row[3]:.1f}%"
            for row in rows
        )
        overall_change = latest[3] - oldest[3]
        return (
            f"Body fat trend for {full_name}: {trend}. "
            f"Overall change from first to latest is {overall_change:+.1f} percentage points."
        )

    # 7) Lean mass trend / history / change
    if "lean mass" in q and any(term in q for term in ["trend", "trends", "history", "progress", "change"]):
        if len(rows) == 1:
            return (
                f"{full_name} only has one scan so there is no lean mass trend yet. "
                f"The current recorded lean mass is {latest[5]:.1f} kg on {latest[1].strftime('%Y-%m-%d')}."
            )

        trend = "; ".join(
            f"{row[1].strftime('%Y-%m-%d')}: {row[5]:.1f} kg"
            for row in rows
        )
        overall_change = latest[5] - oldest[5]
        return (
            f"Lean mass trend for {full_name}: {trend}. "
            f"Overall change from first to latest is {overall_change:+.1f} kg."
        )

    # 8) Previous / before last lean mass
    if "lean mass" in q and any(term in q for term in ["before the last scan", "previous scan", "prior scan", "before last"]):
        if not previous:
            return f"{full_name} has only one scan, so there is no previous lean mass value yet."
        return (
            f"Before the latest scan, {full_name}'s lean mass was {previous[5]:.1f} kg "
            f"on {previous[1].strftime('%Y-%m-%d')}."
        )

    # 9) Scan count
    if "how many scans" in q or "number of scans" in q or "scan count" in q:
        return f"{full_name} has {len(rows)} recorded scan{'s' if len(rows) != 1 else ''}."

    # 10) Latest scan change / what changed
    if any(term in q for term in ["what changed", "latest scan change", "change since last", "since the last scan"]):
        if not previous:
            return (
                f"{full_name} has only one scan so there is no previous scan to compare against yet. "
                f"Latest scan: {_format_scan_line(latest)}."
            )

        return (
            f"From the previous scan to the latest scan for {full_name}, "
            f"weight changed by {latest[2] - previous[2]:+.1f} kg, "
            f"body fat changed by {latest[3] - previous[3]:+.1f} percentage points, "
            f"fat mass changed by {latest[4] - previous[4]:+.1f} kg, "
            f"and lean mass changed by {latest[5] - previous[5]:+.1f} kg."
        )

    # 11) Coaching focus / next session
    if "focus on" in q or "next coaching session" in q or "coaching focus" in q:
        if not previous:
            return (
                f"{full_name} only has one scan, so I would focus on baseline education, "
                f"consistency habits, and interpreting the current metrics before making aggressive changes."
            )

        lean_delta = latest[5] - previous[5]
        fat_delta = latest[4] - previous[4]
        body_fat_delta = latest[3] - previous[3]

        if lean_delta < 0:
            return (
                f"For {full_name}, I would focus on preserving or rebuilding lean mass because "
                f"the latest scan shows a lean mass drop of {abs(lean_delta):.1f} kg since the previous scan."
            )

        if fat_delta > 0 or body_fat_delta > 0:
            return (
                f"For {full_name}, I would focus on nutrition adherence and activity consistency because "
                f"the latest scan shows fat mass change of {fat_delta:+.1f} kg and body fat change of "
                f"{body_fat_delta:+.1f} percentage points since the previous scan."
            )

        return (
            f"For {full_name}, I would reinforce what is already working because "
            f"lean mass is stable or improving and body fat is stable or improving between the last two scans."
        )

    # 12) Generic member fallback: do not reject, summarize
    return _member_summary(db, member_name)