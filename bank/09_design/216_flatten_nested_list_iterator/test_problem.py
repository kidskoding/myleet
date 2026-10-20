from solution import NestedInteger, NestedIterator


def build(items: list) -> list[NestedInteger]:
    return [NestedInteger(item if isinstance(item, int) else build(item)) for item in items]


def drain(items: list) -> list[int]:
    iterator = NestedIterator(build(items))
    out = []
    while iterator.has_next():
        out.append(iterator.next())
    return out


def test_nested_iterator_two_levels():
    assert drain([[1, 1], 2, [1, 1]]) == [1, 1, 2, 1, 1]


def test_nested_iterator_deep_nesting():
    assert drain([1, [4, [6]]]) == [1, 4, 6]


def test_nested_iterator_empty():
    assert drain([]) == []


def test_nested_iterator_only_empty_lists():
    assert drain([[], [[]]]) == []


def test_nested_iterator_skips_empty_lists_between_values():
    assert drain([[[[5]]], [], 7]) == [5, 7]


def test_nested_iterator_has_next_is_idempotent():
    iterator = NestedIterator(build([[], [3]]))
    assert iterator.has_next() is True
    assert iterator.has_next() is True
    assert iterator.next() == 3
    assert iterator.has_next() is False
