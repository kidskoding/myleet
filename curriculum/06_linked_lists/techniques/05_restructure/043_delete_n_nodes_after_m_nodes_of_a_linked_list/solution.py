from list_node import ListNode


def delete_nodes(head: ListNode | None, m: int, n: int) -> ListNode | None:
    # Problem 43: Delete N Nodes After M Nodes of a Linked List
    # Time: O(length)
    # Space: O(1)

    curr = head
    while curr is not None:
        for _ in range(1, m):
            if curr is None:
                return head
            curr = curr.next

        if curr is None:
            break

        delete_cursor = curr.next
        for _ in range(n):
            if delete_cursor is None:
                break
            delete_cursor = delete_cursor.next

        curr.next = delete_cursor
        curr = delete_cursor

    return head
