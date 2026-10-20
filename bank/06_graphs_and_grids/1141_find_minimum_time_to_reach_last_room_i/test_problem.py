from solution import min_time_to_reach


def test_min_time_to_reach_wait_for_room():
    assert min_time_to_reach([[0, 4], [4, 4]]) == 6


def test_min_time_to_reach_all_open():
    assert min_time_to_reach([[0, 0, 0], [0, 0, 0]]) == 3


def test_min_time_to_reach_small_waits():
    assert min_time_to_reach([[0, 1], [1, 2]]) == 3


def test_min_time_to_reach_target_opens_late():
    assert min_time_to_reach([[0, 0], [0, 100]]) == 101


def test_min_time_to_reach_detour_beats_waiting():
    assert min_time_to_reach([[0, 10, 0], [0, 10, 0], [0, 0, 0]]) == 4


def test_min_time_to_reach_start_cell_time_ignored():
    assert min_time_to_reach([[50, 0], [0, 0]]) == 2
