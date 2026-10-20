def people_indexes(favorite_companies: list[list[str]]) -> list[int]:
    sets = [set(companies) for companies in favorite_companies]
    return [
        i
        for i, mine in enumerate(sets)
        if not any(i != j and len(mine) < len(other) and mine <= other for j, other in enumerate(sets))
    ]
