from solution import beautiful_array


def test_beautiful_array_single():
    assert beautiful_array(1) == [1]


def test_beautiful_array_is_permutation():
    n = 6
    result = beautiful_array(n)
    assert sorted(result) == list(range(1, n + 1))


def test_beautiful_array_no_arithmetic_triple():
    result = beautiful_array(8)
    values = {v: i for i, v in enumerate(result)}
    for a in range(1, 9):
        for b in range(a + 1, 9):
            c = 2 * b - a
            if c in values:
                assert not (values[a] < values[b] < values[c])
