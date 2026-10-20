from solution import valid_arrangement


def assert_valid(pairs, result):
    assert sorted(map(tuple, result)) == sorted(map(tuple, pairs))
    for prev, cur in zip(result, result[1:]):
        assert prev[1] == cur[0]


def test_valid_arrangement_path():
    pairs = [[5, 1], [4, 5], [11, 9], [9, 4]]
    result = valid_arrangement(pairs)
    assert_valid(pairs, result)
    assert result[0] == [11, 9]


def test_valid_arrangement_cycle():
    pairs = [[1, 3], [3, 2], [2, 1]]
    assert_valid(pairs, valid_arrangement(pairs))


def test_valid_arrangement_branching():
    pairs = [[1, 2], [1, 3], [2, 1]]
    result = valid_arrangement(pairs)
    assert_valid(pairs, result)
    assert result[0][0] == 1 and result[-1] == [1, 3]


def test_valid_arrangement_single_pair():
    assert valid_arrangement([[0, 7]]) == [[0, 7]]


def test_valid_arrangement_two_loops_through_hub():
    pairs = [[0, 1], [1, 0], [0, 2], [2, 0], [0, 3]]
    result = valid_arrangement(pairs)
    assert_valid(pairs, result)
    assert result[-1] == [0, 3]
