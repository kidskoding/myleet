from list_node import ListNode
from solution import delete_duplicates_ii


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_delete_duplicates_ii_removes_all_dupes():
    head = build_list([1, 2, 3, 3, 4, 4, 5])
    assert to_list(delete_duplicates_ii(head)) == [1, 2, 5]


def test_delete_duplicates_ii_leading_dupes():
    head = build_list([1, 1, 1, 2, 3])
    assert to_list(delete_duplicates_ii(head)) == [2, 3]


def test_delete_duplicates_ii_empty():
    assert delete_duplicates_ii(None) is None
