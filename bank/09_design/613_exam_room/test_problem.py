from solution import ExamRoom


def test_exam_room_example():
    room = ExamRoom(10)
    assert room.seat() == 0
    assert room.seat() == 9
    assert room.seat() == 4
    assert room.seat() == 2
    room.leave(4)
    assert room.seat() == 5


def test_exam_room_single_seat():
    room = ExamRoom(1)
    assert room.seat() == 0
    room.leave(0)
    assert room.seat() == 0


def test_exam_room_fill_small_room():
    room = ExamRoom(3)
    assert [room.seat(), room.seat(), room.seat()] == [0, 2, 1]


def test_exam_room_reclaims_left_end():
    room = ExamRoom(10)
    assert [room.seat(), room.seat(), room.seat()] == [0, 9, 4]
    room.leave(0)
    assert room.seat() == 0


def test_exam_room_tie_prefers_lower_seat():
    room = ExamRoom(5)
    assert [room.seat(), room.seat(), room.seat()] == [0, 4, 2]
    room.leave(0)
    room.leave(4)
    assert room.seat() == 0
    assert room.seat() == 4
