from solution import FileSharing


def test_file_sharing_example():
    system = FileSharing(4)
    assert system.join([1, 2]) == 1
    assert system.join([2, 3]) == 2
    assert system.join([4]) == 3
    assert system.request(1, 3) == [2]
    assert system.request(2, 2) == [1, 2]
    system.leave(1)
    assert system.request(2, 1) == []
    system.leave(2)
    assert system.join([]) == 1


def test_file_sharing_reuses_smallest_free_id():
    system = FileSharing(3)
    assert [system.join([]) for _ in range(3)] == [1, 2, 3]
    system.leave(3)
    system.leave(1)
    assert system.join([]) == 1
    assert system.join([]) == 3
    assert system.join([]) == 4


def test_file_sharing_failed_request_gives_nothing():
    system = FileSharing(2)
    a = system.join([])
    b = system.join([])
    assert system.request(a, 2) == []
    assert system.request(b, 2) == []


def test_file_sharing_received_chunk_is_shared_onward():
    system = FileSharing(5)
    a = system.join([5])
    b = system.join([])
    c = system.join([])
    assert system.request(b, 5) == [a]
    system.leave(a)
    assert system.request(c, 5) == [b]
    assert system.request(c, 5) == [b, c]


def test_file_sharing_leaving_drops_owned_chunks():
    system = FileSharing(2)
    a = system.join([1, 2])
    b = system.join([])
    system.leave(a)
    assert system.request(b, 1) == []
    assert system.request(b, 2) == []
