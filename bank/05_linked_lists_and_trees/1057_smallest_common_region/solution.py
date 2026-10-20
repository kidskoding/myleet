def find_smallest_region(regions: list[list[str]], region1: str, region2: str) -> str:
    parent: dict[str, str] = {}
    for group in regions:
        for child in group[1:]:
            parent[child] = group[0]
    ancestors = {region1}
    node = region1
    while node in parent:
        node = parent[node]
        ancestors.add(node)
    node = region2
    while node not in ancestors:
        node = parent[node]
    return node
