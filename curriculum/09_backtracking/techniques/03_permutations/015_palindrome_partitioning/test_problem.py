from solution import partition


def to_sorted_lists(result: list[list]) -> list[tuple]:
    return sorted(tuple(group) for group in result)


def test_partition_single_char():
    assert partition("a") == [["a"]]


def test_partition_normal():
    assert to_sorted_lists(partition("aab")) == to_sorted_lists([["a", "a", "b"], ["aa", "b"]])


def test_partition_no_palindromic_split_needed():
    assert partition("") == [[]]
