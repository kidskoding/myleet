from solution import SnapshotArray


def test_snapshot_array_reads_old_snapshot():
    array = SnapshotArray(3)
    array.set(0, 5)

    assert array.snap() == 0
    array.set(0, 6)
    assert array.get(0, 0) == 5


def test_snapshot_array_unset_index_is_zero():
    array = SnapshotArray(2)
    snap_id = array.snap()

    assert array.get(1, snap_id) == 0
