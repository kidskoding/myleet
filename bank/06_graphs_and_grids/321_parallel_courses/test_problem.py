from solution import minimum_semesters


def test_minimum_semesters_example():
    assert minimum_semesters(3, [[1, 3], [2, 3]]) == 2


def test_minimum_semesters_cycle():
    assert minimum_semesters(3, [[1, 2], [2, 3], [3, 1]]) == -1


def test_minimum_semesters_single_course():
    assert minimum_semesters(1, []) == 1


def test_minimum_semesters_no_prerequisites():
    assert minimum_semesters(4, []) == 1


def test_minimum_semesters_longest_chain_wins():
    assert minimum_semesters(5, [[1, 2], [2, 3], [3, 4], [1, 5]]) == 4


def test_minimum_semesters_cycle_in_one_part():
    assert minimum_semesters(4, [[1, 2], [3, 4], [4, 3]]) == -1
