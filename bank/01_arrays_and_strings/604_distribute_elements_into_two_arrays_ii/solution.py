class Fenwick:
    def __init__(self, n: int) -> None:
        self.tree = [0] * (n + 1)

    def add(self, i: int) -> None:
        while i < len(self.tree):
            self.tree[i] += 1
            i += i & -i

    def prefix(self, i: int) -> int:
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total


def result_array(nums: list[int]) -> list[int]:
    rank = {v: i + 1 for i, v in enumerate(sorted(set(nums)))}
    size = len(rank)
    arr1, arr2 = [nums[0]], [nums[1]]
    tree1, tree2 = Fenwick(size), Fenwick(size)
    tree1.add(rank[nums[0]])
    tree2.add(rank[nums[1]])
    for x in nums[2:]:
        r = rank[x]
        greater1 = len(arr1) - tree1.prefix(r)
        greater2 = len(arr2) - tree2.prefix(r)
        if greater1 > greater2 or (greater1 == greater2 and len(arr1) <= len(arr2)):
            arr1.append(x)
            tree1.add(r)
        else:
            arr2.append(x)
            tree2.add(r)
    return arr1 + arr2
