from solution import min_available_duration


def test_min_available_duration_example():
    slots1 = [[10, 50], [60, 120], [140, 210]]
    slots2 = [[0, 15], [60, 70]]
    assert min_available_duration(slots1, slots2, 8) == [60, 68]


def test_min_available_duration_too_long():
    slots1 = [[10, 50], [60, 120], [140, 210]]
    slots2 = [[0, 15], [60, 70]]
    assert min_available_duration(slots1, slots2, 12) == []


def test_min_available_duration_unsorted_input():
    slots1 = [[140, 210], [60, 120], [10, 50]]
    slots2 = [[60, 70], [0, 15]]
    assert min_available_duration(slots1, slots2, 8) == [60, 68]


def test_min_available_duration_exact_fit():
    assert min_available_duration([[0, 5]], [[0, 5]], 5) == [0, 5]


def test_min_available_duration_picks_earliest():
    slots1 = [[0, 100]]
    slots2 = [[50, 60], [10, 20]]
    assert min_available_duration(slots1, slots2, 10) == [10, 20]


def test_min_available_duration_touching_slots_do_not_overlap():
    assert min_available_duration([[0, 10]], [[10, 20]], 1) == []
