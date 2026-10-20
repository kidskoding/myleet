from solution import min_number_of_semesters


def test_min_number_of_semesters_no_relations():
    assert min_number_of_semesters(4, [], 4) == 1


def test_min_number_of_semesters_single_course():
    assert min_number_of_semesters(1, [], 1) == 1


def test_min_number_of_semesters_chain_with_limit():
    assert min_number_of_semesters(4, [[2, 1], [3, 1], [1, 4]], 2) == 3


def test_min_number_of_semesters_no_limit_needed():
    assert min_number_of_semesters(5, [[2, 1], [3, 1], [4, 1], [1, 5]], 2) == 4
