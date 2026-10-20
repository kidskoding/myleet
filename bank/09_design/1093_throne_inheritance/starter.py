class ThroneInheritance:
    # Problem 1093: Throne Inheritance
    # Time:
    # Space:

    def __init__(self, king_name: str) -> None:
        raise NotImplementedError

    def birth(self, parent_name: str, child_name: str) -> None:
        raise NotImplementedError

    def death(self, name: str) -> None:
        raise NotImplementedError

    def get_inheritance_order(self) -> list[str]:
        raise NotImplementedError
