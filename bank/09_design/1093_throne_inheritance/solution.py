from collections import defaultdict


class ThroneInheritance:
    def __init__(self, king_name: str) -> None:
        self.king = king_name
        self.children: dict[str, list[str]] = defaultdict(list)
        self.dead: set[str] = set()

    def birth(self, parent_name: str, child_name: str) -> None:
        self.children[parent_name].append(child_name)

    def death(self, name: str) -> None:
        self.dead.add(name)

    def get_inheritance_order(self) -> list[str]:
        order: list[str] = []
        stack = [self.king]
        while stack:
            name = stack.pop()
            if name not in self.dead:
                order.append(name)
            stack.extend(reversed(self.children[name]))
        return order
