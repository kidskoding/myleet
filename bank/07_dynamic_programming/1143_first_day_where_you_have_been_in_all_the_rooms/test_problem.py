from solution import first_day_been_in_all_rooms


def test_first_day_been_in_all_rooms_two_rooms():
    assert first_day_been_in_all_rooms([0, 0]) == 2


def test_first_day_been_in_all_rooms_jump_back_to_start():
    assert first_day_been_in_all_rooms([0, 0, 2]) == 6


def test_first_day_been_in_all_rooms_stay_in_place():
    assert first_day_been_in_all_rooms([0, 1, 2, 0]) == 6


def test_first_day_been_in_all_rooms_always_back_to_zero():
    assert first_day_been_in_all_rooms([0, 0, 0, 0, 0]) == 30


def test_first_day_been_in_all_rooms_modulo():
    assert first_day_been_in_all_rooms([0] * 100) == 976371283


def test_first_day_been_in_all_rooms_long_self_loops():
    assert first_day_been_in_all_rooms(list(range(100000))) == 199998
