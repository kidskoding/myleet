from solution import num_music_playlists


def test_num_music_playlists_example_one():
    assert num_music_playlists(3, 3, 1) == 6


def test_num_music_playlists_example_two():
    assert num_music_playlists(2, 3, 0) == 6


def test_num_music_playlists_example_three():
    assert num_music_playlists(2, 3, 1) == 2


def test_num_music_playlists_repeat_allowed():
    assert num_music_playlists(1, 3, 0) == 1


def test_num_music_playlists_exact_cover():
    assert num_music_playlists(4, 4, 0) == 24
