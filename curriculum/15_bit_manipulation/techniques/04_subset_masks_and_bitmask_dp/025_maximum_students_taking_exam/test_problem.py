from solution import max_students


def test_max_students_normal():
    seats = [
        ["#", ".", "#", "#", ".", "#"],
        [".", "#", "#", "#", "#", "."],
        ["#", ".", "#", "#", ".", "#"],
    ]
    assert max_students(seats) == 4


def test_max_students_narrow_room():
    seats = [[".", "#"], ["#", "#"], ["#", "."], ["#", "#"], [".", "#"]]
    assert max_students(seats) == 3
