from solution import find_subsequences


def normalize(result: list[list[int]]) -> list[list[int]]:
    return sorted(result)


def test_find_subsequences_example_with_duplicates():
    expected = [[4, 6], [4, 6, 7], [4, 6, 7, 7], [4, 7], [4, 7, 7], [6, 7], [6, 7, 7], [7, 7]]
    assert normalize(find_subsequences([4, 6, 7, 7])) == sorted(expected)


def test_find_subsequences_only_equal_pair():
    assert normalize(find_subsequences([4, 4, 3, 2, 1])) == [[4, 4]]


def test_find_subsequences_single_element():
    assert find_subsequences([1]) == []


def test_find_subsequences_strictly_decreasing():
    assert find_subsequences([3, 2, 1]) == []


def test_find_subsequences_all_equal():
    assert normalize(find_subsequences([1, 1, 1])) == [[1, 1], [1, 1, 1]]


def test_find_subsequences_negative_values():
    expected = [[-1, -1], [-1, -1, 0], [-1, 0], [-1, 0, 0], [0, 0]]
    assert normalize(find_subsequences([-1, 0, -1, 0])) == sorted(expected)
