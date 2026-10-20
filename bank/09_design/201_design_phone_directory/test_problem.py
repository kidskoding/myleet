from solution import PhoneDirectory


def test_phone_directory_hands_out_distinct_numbers():
    directory = PhoneDirectory(3)
    assert {directory.get() for _ in range(3)} == {0, 1, 2}
    assert directory.get() == -1


def test_phone_directory_check_reflects_assignment():
    directory = PhoneDirectory(2)
    taken = directory.get()
    assert directory.check(taken) is False
    assert directory.check(1 - taken) is True


def test_phone_directory_release_makes_number_available_again():
    directory = PhoneDirectory(1)
    assert directory.get() == 0
    assert directory.get() == -1
    directory.release(0)
    assert directory.check(0) is True
    assert directory.get() == 0


def test_phone_directory_double_release_is_harmless():
    directory = PhoneDirectory(2)
    directory.get()
    directory.get()
    directory.release(1)
    directory.release(1)
    assert directory.get() == 1
    assert directory.get() == -1


def test_phone_directory_release_of_free_number_is_noop():
    directory = PhoneDirectory(2)
    directory.release(0)
    assert {directory.get(), directory.get()} == {0, 1}
    assert directory.get() == -1
