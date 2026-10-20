from __future__ import annotations


class NestedInteger:
    def __init__(self, value: int | None = None) -> None:
        self._value: int | list[NestedInteger] = [] if value is None else value

    def is_integer(self) -> bool:
        return isinstance(self._value, int)

    def get_integer(self) -> int:
        assert isinstance(self._value, int)
        return self._value

    def set_integer(self, value: int) -> None:
        self._value = value

    def add(self, elem: NestedInteger) -> None:
        if not isinstance(self._value, list):
            self._value = []
        self._value.append(elem)

    def get_list(self) -> list[NestedInteger]:
        assert isinstance(self._value, list)
        return self._value


def deserialize(s: str) -> NestedInteger:
    if s[0] != "[":
        return NestedInteger(int(s))
    stack: list[NestedInteger] = []
    number = ""
    result = NestedInteger()
    for ch in s:
        if ch == "[":
            stack.append(NestedInteger())
        elif ch == "-" or ch.isdigit():
            number += ch
        else:
            if number:
                stack[-1].add(NestedInteger(int(number)))
                number = ""
            if ch == "]":
                finished = stack.pop()
                if stack:
                    stack[-1].add(finished)
                else:
                    result = finished
    return result
