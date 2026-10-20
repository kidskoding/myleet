from solution import contains_cycle


def test_contains_cycle_true():
    grid = [["a", "a", "a", "a"], ["a", "b", "b", "a"], ["a", "b", "b", "a"], ["a", "a", "a", "a"]]

    assert contains_cycle(grid) is True


def test_contains_cycle_false():
    grid = [["a", "b"], ["c", "d"]]

    assert contains_cycle(grid) is False
