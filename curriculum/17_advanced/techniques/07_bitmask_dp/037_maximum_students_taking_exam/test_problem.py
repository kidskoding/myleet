from solution import max_students


def test_max_students_normal():
    seats = [
        ["#", ".", "#", "#", ".", "#"],
        [".", "#", "#", "#", "#", "."],
        ["#", ".", "#", "#", ".", "#"],
    ]
    assert max_students(seats) == 4


def test_max_students_all_broken_seats():
    assert max_students([["#", "#"], ["#", "#"]]) == 0


def test_max_students_single_seat():
    assert max_students([["."]]) == 1
