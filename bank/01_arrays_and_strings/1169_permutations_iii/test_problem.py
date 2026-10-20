from solution import permute


def test_permute_four():
    assert permute(4) == [
        [1, 2, 3, 4],
        [1, 4, 3, 2],
        [2, 1, 4, 3],
        [2, 3, 4, 1],
        [3, 2, 1, 4],
        [3, 4, 1, 2],
        [4, 1, 2, 3],
        [4, 3, 2, 1],
    ]


def test_permute_two():
    assert permute(2) == [[1, 2], [2, 1]]


def test_permute_three():
    assert permute(3) == [[1, 2, 3], [3, 2, 1]]


def test_permute_one():
    assert permute(1) == [[1]]


def test_permute_five_must_start_odd():
    result = permute(5)
    assert len(result) == 12
    assert result == sorted(result)
    assert all(p[0] % 2 == 1 for p in result)


def test_permute_six_count():
    result = permute(6)
    assert len(result) == 72
    assert all(sorted(p) == [1, 2, 3, 4, 5, 6] for p in result)
