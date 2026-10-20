def find_restaurant(list1: list[str], list2: list[str]) -> list[str]:
    where = {name: i for i, name in enumerate(list1)}
    best = len(list1) + len(list2)
    result: list[str] = []
    for j, name in enumerate(list2):
        if name not in where:
            continue
        total = where[name] + j
        if total < best:
            best = total
            result = [name]
        elif total == best:
            result.append(name)
    return result
