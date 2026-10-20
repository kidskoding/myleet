MOD = 10**9 + 7


def create_sorted_array(instructions: list[int]) -> int:
    size = max(instructions)
    tree = [0] * (size + 1)

    def add(i: int) -> None:
        while i <= size:
            tree[i] += 1
            i += i & -i

    def prefix(i: int) -> int:
        total = 0
        while i > 0:
            total += tree[i]
            i -= i & -i
        return total

    cost = 0
    for inserted, x in enumerate(instructions):
        less = prefix(x - 1)
        greater = inserted - prefix(x)
        cost += min(less, greater)
        add(x)
    return cost % MOD
