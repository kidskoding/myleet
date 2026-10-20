from solution import most_booked_room


def test_most_booked_room_normal():
    assert most_booked_room(2, [[0, 10], [1, 5], [2, 7], [3, 4]]) == 0


def test_most_booked_room_single_room():
    assert most_booked_room(1, [[1, 10]]) == 0
